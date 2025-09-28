package org.sncrwanda.ledger.service;

import org.sncrwanda.ledger.domain.Transaction;
import org.sncrwanda.ledger.dto.TransactionRequest;
import org.sncrwanda.ledger.dto.TransactionResponse;
import org.sncrwanda.ledger.repo.TransactionRepository;
import org.sncrwanda.ledger.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TransactionService {
    @Autowired
    private TransactionRepository repo;

    public List<TransactionResponse> listAll() {
        if (SecurityUtils.isAdmin()) {
            return repo.findAll().stream().map(this::toResponse).collect(Collectors.toList());
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return repo.findByBranchId(branchId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<TransactionResponse> getById(UUID id) {
        return repo.findById(id).map(t -> {
            if (SecurityUtils.isAdmin()) return toResponse(t);
            UUID branchId = SecurityUtils.getBranchId();
            if (branchId == null) return null;
            return branchId.equals(t.getBranchId()) ? toResponse(t) : null;
        });
    }

    @Transactional
    public TransactionResponse create(TransactionRequest req) {
        UUID requestedBranch = req.getBranchId();
        UUID userBranch = SecurityUtils.getBranchId();
        if (!SecurityUtils.isAdmin()) {
            if (userBranch == null) throw new RuntimeException("User branch not found in token");
            if (requestedBranch != null && !userBranch.equals(requestedBranch)) throw new RuntimeException("Cannot create transaction for another branch");
            requestedBranch = userBranch;
        }

        Transaction t = new Transaction();
        t.setType(req.getType());
        t.setCategory(req.getCategory());
        t.setName(req.getName());
        if (req.getMaterials() != null) t.setMaterials(req.getMaterials());
        t.setAmount(req.getAmount());
        if (req.getTxDate() != null) t.setTxDate(req.getTxDate());
        t.setNotes(req.getNotes());
        if (requestedBranch != null) t.setBranchId(requestedBranch);
        t = repo.save(t);
        return toResponse(t);
    }

    @Transactional
    public Optional<TransactionResponse> update(UUID id, TransactionRequest req) {
        return repo.findById(id).map(t -> {
            if (!SecurityUtils.isAdmin()) {
                UUID userBranch = SecurityUtils.getBranchId();
                if (userBranch == null || !userBranch.equals(t.getBranchId())) throw new RuntimeException("No permission to update this transaction");
                if (req.getBranchId() != null && !userBranch.equals(req.getBranchId())) throw new RuntimeException("Cannot move transaction to another branch");
            }
            t.setType(req.getType());
            t.setCategory(req.getCategory());
            t.setName(req.getName());
            t.setMaterials(req.getMaterials());
            t.setAmount(req.getAmount());
            if (req.getTxDate() != null) t.setTxDate(req.getTxDate());
            t.setNotes(req.getNotes());
            if (req.getBranchId() != null) t.setBranchId(req.getBranchId());
            return toResponse(repo.save(t));
        });
    }

    @Transactional
    public boolean delete(UUID id) {
        Optional<Transaction> opt = repo.findById(id);
        if (opt.isEmpty()) return false;
        Transaction t = opt.get();
        if (SecurityUtils.isAdmin()) {
            repo.deleteById(id);
            return true;
        }
        UUID userBranch = SecurityUtils.getBranchId();
        if (userBranch != null && userBranch.equals(t.getBranchId())) {
            repo.deleteById(id);
            return true;
        }
        return false;
    }

    private TransactionResponse toResponse(Transaction t) {
        TransactionResponse r = new TransactionResponse();
        r.setId(t.getId());
        r.setType(t.getType());
        r.setCategory(t.getCategory());
        r.setName(t.getName());
        r.setMaterials(t.getMaterials());
        r.setAmount(t.getAmount());
        r.setTxDate(t.getTxDate());
        r.setNotes(t.getNotes());
        r.setBranchId(t.getBranchId());
        return r;
    }
}
